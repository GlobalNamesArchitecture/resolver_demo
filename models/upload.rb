# encoding: utf-8

class Upload < ActiveRecord::Base
  after_create :initiate_data
  
  STATUS = { init: 0, find_sent: 1, find_busy: 2, found: 3, resolve_sent: 4, resolved: 5, failed: 6 }
  
  serialize :found_names, Hash
  serialize :resolved_names, Hash
  
  def self.generate_token
    Base64.urlsafe_encode64(UUID.create_v4.raw_bytes)[0..-3]
  end

  def get_names
    find_names if status == Upload::STATUS[:find_sent]
    resolve_names if status == Upload::STATUS[:found]
    output
  end

  private

  def initiate_data
    self.token = "_"
    while token.match(/[_-]/)
      self.token = self.class.generate_token
    end

    file_name = file_path.split("/")[1]
    params = { :file => File.new(File.join(SiteConfig::upload_path, file_name)), :verbatim => true, :detect_language => false }
    res = RestClient.post(SiteConfig::gnrd_url, params) do |response, request, result, &block|
      if [302, 303].include? response.code
        save_location(response.headers[:location])
      else
        failed
      end
    end
  end
  
  def set_status(new_status)
    self.status = new_status
    self.save!
  end

  def save_location(location)
    self.gnrd_url = location
    self.status = Upload::STATUS[:find_sent]
    self.save!
  end
  
  def find_names
    set_status(Upload::STATUS[:find_busy])
    response = nil
    until response
      sleep(2)
      response = JSON.parse(RestClient.get(gnrd_url), :symbolize_names => true)[:names] rescue set_status(Upload::STATUS[:failed])
    end
    save_names(response)
  end
  
  def save_names(response)
    names = response.map { |i| i[:identifiedName] }.uniq! || []
    self.found_names = { :found_names => names }
    self.status = Upload::STATUS[:found]
    self.save!
  end
  
  def resolve_names
    set_status(Upload::STATUS[:resolve_sent])
    names = found_names[:found_names].join("\n")
    params = { :data => names, :data_source_ids => SiteConfig::union_id, :with_context => true }
    response = JSON.parse(RestClient.post(SiteConfig::resolver_url, params), :symbolize_names => true) rescue update_status(Upload::STATUS[:failed])
    self.status = Upload::STATUS[:resolved]
    self.resolved_names = response
    self.save!
  end
  
  def output
    resolved_names.merge({ :status => status })
  end
  
end