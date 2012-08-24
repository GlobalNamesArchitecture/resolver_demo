# encoding: utf-8
class Upload < ActiveRecord::Base
  after_create :initiate_data
  
  def self.generate_token
    Base64.urlsafe_encode64(UUID.create_v4.raw_bytes)[0..-3]
  end

  def get_names
    return output if !output.nil?
    response = nil
    until response
      sleep(2)
      response = JSON.parse(RestClient.get(gnrd_url), :symbolize_names => true)[:names]
    end
    save_output(response)
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
        #TODO
      end
    end
  end

  def save_location(location)
    self.gnrd_url = location
    self.save!
    reload
  end
  
  def save_output(response)
    self.output = {:names => response }.to_json
    self.save!
    reload
  end
  
end