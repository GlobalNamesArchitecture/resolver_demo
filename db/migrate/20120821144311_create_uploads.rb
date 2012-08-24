class CreateUploads < ActiveRecord::Migration
  def change
    create_table :uploads do |t|
      t.string  :token
      t.string  :file_path
      t.string  :gnrd_url
      t.timestamps
    end
    add_index :uploads, :token, :unique => true
  end
end
