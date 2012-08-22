class Cleaner
  @date = Time.now().to_s[0..9]

  def self.run
    today = Time.now().to_s[0..9]
    if @date != today
      ActiveRecord::Base.connection.execute("DELETE FROM uploads WHERE updated_at < DATE_SUB(CURDATE(),INTERVAL #{SiteConfig.cleaner_period} DAY)")
      #TODO: delete files as well
      @date = today
    end  
  end

end