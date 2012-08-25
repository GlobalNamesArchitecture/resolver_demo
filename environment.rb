require 'haml'
require 'bundler/setup'
require 'ostruct'
require 'yaml'
require 'active_record'
require 'logger'
require 'sinatra'
require 'sinatra/content_for'
require 'rest_client'

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
                 :host => conf.delete('host') || '0.0.0.0',
                 :root_path => root_path,
                 :upload_path => File.join(root_path, "public", "uploads"),
                 :salt => conf.delete('salt'),
                 :gnrd_url => conf.delete('gnrd_url') || "http://gnrd.globalnames.org/name_finder.json",
                 :resolver_url => conf.delete('resolver_url') || "http://resolver.globalnames.org/name_resolvers.json",
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