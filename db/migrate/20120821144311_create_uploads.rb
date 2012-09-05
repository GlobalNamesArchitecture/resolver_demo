class CreateUploads < ActiveRecord::Migration
  def change
    create_table :uploads do |t|
      t.string  :token
      t.string  :file_path
      t.string  :gnrd_url
      t.string  :resolver_url
      t.text    :found_names
      t.text    :resolved_names
      t.integer :status, :default => 0
      t.timestamps
    end
    add_index :uploads, :token, :unique => true
    execute "alter table uploads modify column found_names mediumtext"
    execute "alter table uploads modify column resolved_names mediumtext"
  end
end
