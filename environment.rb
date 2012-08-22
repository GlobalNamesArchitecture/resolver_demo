require 'haml'
require 'bundler/setup'
require 'sass'
require 'ostruct'
require 'yaml'
require 'active_record'
require 'logger'
require 'sinatra'
require 'sinatra/content_for'

#set environment
environment = ENV["RACK_ENV"] || ENV["RAILS_ENV"]
environment = (environment && ["production", "test", "development"].include?(environment.downcase)) ? environment.downcase.to_sym : :development
Sinatra::Base.environment = environment

#set encoding
Encoding.default_external = "UTF-8"

#configure
root_path = File.expand_path(File.dirname(__FILE__))
conf = YAML.load(open(File.join(root_path, 'config.yml')).read)[Sinatra::Base.environment.to_s]
configure do
  SiteConfig = OpenStruct.new(
                 :root_path => root_path,
                 :upload_path => File.join(root_path, "public", "uploads"),
                 :salt => conf.delete('salt'),
                 :grnd_url => "http://gnrd.globalnames.org/name_finder.json",
                 :resolver_url => "http://resolver.globalnames.org/name_resolvers.json",
                 :cleaner_period => 7,
               )

  # to see sql during tests uncomment next line
  ActiveRecord::Base.logger = Logger.new(STDOUT, :debug)
  ActiveRecord::Base.establish_connection(conf)

  # load models
  $LOAD_PATH.unshift(File.join(File.dirname(__FILE__), 'lib'))
  $LOAD_PATH.unshift(File.join(File.dirname(__FILE__), 'models'))
  Dir.glob(File.join(File.dirname(__FILE__), 'lib', '**', '*.rb')) { |lib| require File.basename(lib, '.*') }
  Dir.glob(File.join(File.dirname(__FILE__), 'models', '*.rb')) { |model| require File.basename(model, '.*') }
end

#production-specific
site_specific_file =  File.join(File.dirname(__FILE__), 'config', 'production_site_specific')
require site_specific_file if File.exists?(site_specific_file + ".rb")

after do
  Cleaner.run
  ActiveRecord::Base.clear_active_connections!
end