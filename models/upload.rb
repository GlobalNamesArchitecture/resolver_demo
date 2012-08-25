# encoding: utf-8

class Upload < ActiveRecord::Base
  after_create :initiate_data
  
  STATUS = { init: 0, sent: 1, completed: 2, failed: 3 }
  
  serialize :verbatim_names, Hash
  
  def self.generate_token
    Base64.urlsafe_encode64(UUID.create_v4.raw_bytes)[0..-3]
  end

  def get_names
    return output if !verbatim_names.empty?
    return output if status == Upload::STATUS[:failed]
    response = nil
    until response
      sleep(2)
      response = JSON.parse(RestClient.get(gnrd_url), :symbolize_names => true)[:names]
    end
    save_verbatim_names(response)
    output
  end

  private

  def initiate_data
    self.token = "_"
    while token.match(/[_-]/)
      self.token = self.class.generate_token
    end

    file_name = file_path.split("/")[1]
    params = { :file => File.new(File.join(SiteConfig::upload_path, file_name)), :verbatim => true }
    res = RestClient.post(SiteConfig::gnrd_url, params) do |response, request, result, &block|
      if [302, 303].include? response.code
        save_location(response.headers[:location])
      else
        failed
      end
    end
  end

  def save_location(location)
    self.gnrd_url = location
    self.status = Upload::STATUS[:sent]
    self.save!
    reload
  end
  
  def save_verbatim_names(response)
    names = response.map { |i| i[:identifiedName] }.uniq! || []
    self.verbatim_names = { :verbatim_names => names }
    self.status = Upload::STATUS[:completed]
    self.save!
    reload
  end
  
  def output
    { :status => status }.merge verbatim_names
  end
  
  def failed
    self.status = Upload::STATUS[:failed]
    self.save!
    reload
  end
  
end