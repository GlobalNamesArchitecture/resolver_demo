ENV['RACK_ENV'] = 'test'

require 'rack/test'
require 'capybara'
require 'capybara/dsl'
require 'capybara/rspec'
require 'capybara-webkit'
require 'database_cleaner'

require_relative '../application.rb'

module RSpecMixin
  include Rack::Test::Methods
  def app() ReconciliationDemo end
end

Capybara.configure do |config|
  config.app = ReconciliationDemo
  config.app_host = "http://#{SiteConfig.host}:#{config.app.port}"
  config.javascript_driver = :webkit
  config.default_driver = :webkit
end

RSpec.configure do |config|
  config.include RSpecMixin
  config.include Capybara::DSL

  config.before :suite do
    DatabaseCleaner.strategy = :truncation
    DatabaseCleaner.clean_with(:truncation)
  end
  
  config.after :each do
    files = Upload.all.map { |f| File.join(SiteConfig.upload_path, f.file_path.split("/")[1]) }
    files.each do |file|
      File.delete(file) if File.exist?(file)
    end
  end
  
  config.after :suite do
    DatabaseCleaner.clean
  end

end