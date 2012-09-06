# this spec requires WebKit from Qt
# see https://github.com/thoughtbot/capybara-webkit/wiki/Installing-Qt-and-compiling-capybara-webkit
# the application must be running the background

# encoding: utf-8
require_relative "./spec_helper"

describe Upload do
  
  it "should upload a PDF and have it render", :js => true do
    visit "/"
    find("#file").should be_true
    file_path = File.join(SiteConfig.root_path, 'spec', 'files', 'dummy_file.pdf')
    attach_file "file", file_path
    click_button "Resolve Names"
    page.should have_content("Congratulations")
    page.should have_content("Yukon")
  end

  it "should upload a PDF with names and have them recognized", :js => true do
    visit "/"
    find("#file").should be_true
    file_path = File.join(SiteConfig.root_path, 'spec', 'files', 'dummy_with_names.pdf')
    attach_file "file", file_path
    click_button "Resolve Names"
    names_loader = "#nameLoader"
    names_viewer = "#namesView"
    find(names_loader).should have_content("Finding names...")
    find(names_viewer).should have_content("Finding names...")
    page.execute_script(<<-JAVASCRIPT)
      $('#sidebarToggle').trigger('click');
      $('#viewNames').trigger('click');
JAVASCRIPT
    name = false
    until name
      sleep(1)
      html = Capybara::Node::Simple.new(body)
      name = html.find(names_viewer).text.include? "Bulimulus"
    end
    find(names_viewer).text.should include("Bulimulus")
    find(names_loader).should have_content("Names Details")
  end
  
end