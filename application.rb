#!/usr/bin/env ruby
require 'rack/timeout'
require 'sinatra'
require 'sinatra/base'
require 'sinatra/flash'
require 'sinatra/redirect_with_flash'
require 'builder'
require 'uri'

class ReconciliationDemo < Sinatra::Base

  require File.join(File.dirname(__FILE__), 'environment')
  
  register Sinatra::Flash
  helpers Sinatra::ContentFor, Sinatra::RedirectWithFlash

  use Rack::Timeout
  Rack::Timeout.timeout = 9_000_000

  enable :sessions
  set :haml, :format => :html5

  def upload(params)
    file = params[:file]
    if file && file[:type] == 'application/pdf'
      encoded_file_name = Upload.generate_token << ".pdf"
      file_path = File.join([SiteConfig::upload_path] + [encoded_file_name])
      FileUtils.mv(file[:tempfile].path, file_path)
      relative_path = file_path.split("/")[-2..-1].join("/")
      upload = Upload.create(:file_path => relative_path)
      redirect "/reconciler?token=" << upload.token
    else
      redirect "/", :flash => { :error => "Files must be of type PDF." }
    end
  end

  get "/" do
    haml :home
  end

  get "/reconciler" do
    if params[:token]
        @upload = Upload.find_by_token(params[:token])
        not_found if @upload.nil?
        haml :reconciler
    else
      not_found
    end
  end

  post "/reconciler" do
    upload(params)
  end

  not_found do
    flash.sweep
    haml :'404'
  end

  after do
    Cleaner.run
    ActiveRecord::Base.clear_active_connections!
  end

  run! if app_file == $0

end