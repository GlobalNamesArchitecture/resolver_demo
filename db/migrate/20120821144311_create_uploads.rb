class CreateUploads < ActiveRecord::Migration
  def change
    create_table :uploads do |t|
      t.string  :token
      t.string  :file_path
      t.string  :gnrd_url
      t.text    :verbatim_names
      t.text    :resolved_names
      t.timestamps
    end
    add_index :uploads, :token, :unique => true
    execute "alter table uploads modify column verbatim_names mediumtext"
    execute "alter table uploads modify column resolved_names mediumtext"
  end
end
