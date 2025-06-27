class CreateStoredMedia < ActiveRecord::Migration[8.0]
  def change
    create_table :stored_media do |t|
      t.references :audio_job, null: false, foreign_key: true
      t.datetime :retention_period

      t.timestamps
    end
  end
end
