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
    r = RestClient.post(SiteConfig::gnrd_url, params) do |response, request, result, &block|
      if [302, 303].include? response.code
        save_location(response.headers[:location])
      else
        set_status(Upload::STATUS[:failed])
      end
    end
  end

  def save_location(location)
    self.gnrd_url = location
    self.status = Upload::STATUS[:find_sent]
    self.save!
  end

  def set_status(new_status)
    self.status = new_status
    self.save!
  end

  def find_names
    set_status(Upload::STATUS[:find_busy])
    response = nil
    counter = 0
    r = nil
    while counter <= 15
      sleep(5)
      r = JSON.parse(RestClient.get(gnrd_url), :symbolize_names => true)[:names] rescue set_status(Upload::STATUS[:failed])
      break if r
      counter += 1
    end
    r.nil? ? set_status(Upload::STATUS[:failed]) : save_found_names(r)
  end
  
  def save_found_names(r)
    names = r.map { |i| i[:identifiedName] }.uniq || []
    self.found_names = { :found_names => names }
    if names.empty?
      self.resolved_names = { :data => [] }
      self.status = Upload::STATUS[:resolved] #premature setting of status, but hey, why resolve no names?
    else
      self.status = Upload::STATUS[:found]
    end
    self.save!
  end
  
  def resolve_names
    set_status(Upload::STATUS[:resolve_sent])
    names = found_names[:found_names].join("\n")
    params = { :data => names, :data_source_ids => SiteConfig::union_id, :with_context => true }
    resource = RestClient::Resource.new(SiteConfig::resolver_url, timeout: 9_000_000, open_timeout: 9_000_000, connection: "Keep-Alive")
    r = resource.post(params)
    r = JSON.parse(r, :symbolize_names => true) rescue set_status(Upload::STATUS[:failed])
    if r && r[:data]
      clean_resolved_names(r)
    end
  end
  
  def clean_resolved_names(r)
    data = []
    r[:data].each do |name|
      data << name if name.has_key?(:results)
    end
    r[:data] = data
    save_resolved_names(r)
  end
  
  def save_resolved_names(r)
    self.status = Upload::STATUS[:resolved]
    self.resolved_names = r
    self.save!
  end
  
  def output
    resolved_names.merge({ :status => status })
  end
  
end