# encoding: utf-8

class Upload < ActiveRecord::Base
  after_create :initiate_data
  
  STATUS = { init: 0, sent: 1, found: 2, resolved: 3, failed: 4 }
  
  serialize :verbatim_names, Hash
  serialize :resolved_names, Hash
  
  def self.generate_token
    Base64.urlsafe_encode64(UUID.create_v4.raw_bytes)[0..-3]
  end

  def get_names
    return output if !resolved_names.empty?
    return output if status == Upload::STATUS[:failed]
    if status == Upload::STATUS[:sent]
      response = nil
      until response
        sleep(2)
        response = JSON.parse(RestClient.get(gnrd_url), :symbolize_names => true)[:names] rescue failed
      end
      found_names(response)
    end
    resolve_names
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
  
  def found_names(response)
    names = response.map { |i| i[:identifiedName] }.uniq! || []
    self.verbatim_names = { :verbatim_names => names }
    self.status = Upload::STATUS[:found]
    self.save!
    reload
  end
  
  def resolve_names
    names = verbatim_names[:verbatim_names].join("\n")
    params = { :data => names, :data_source_ids => SiteConfig::union_id, :with_context => true }
    response = JSON.parse(RestClient.post(SiteConfig::resolver_url, params), :symbolize_names => true)
    self.status = Upload::STATUS[:resolved]
    self.resolved_names = response
    self.save!
    reload
  end
  
  def output
    #TODO: massage results here somehow
    resolved_names.merge({ :status => status })
  end
  
  def failed
    self.status = Upload::STATUS[:failed]
    self.save!
    reload
  end
  
end