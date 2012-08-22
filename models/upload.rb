# encoding: utf-8
class Upload < ActiveRecord::Base
  after_create :initiate_data
  
  def self.generate_token
    Base64.urlsafe_encode64(UUID.create_v4.raw_bytes)[0..-3]
  end

# AFTER_CREATE

  def initiate_data
    self.token = "_"
    while token.match(/[_-]/)
      self.token = self.class.generate_token
    end
    self.save!
    self.reload
  end
  
end