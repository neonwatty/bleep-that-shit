class CreateAudioJobs < ActiveRecord::Migration[8.0]
  def change
    create_table :audio_jobs do |t|
      t.integer :status, default: 0
      t.string :language
      t.string :model
      t.float :progress
      t.text :result
      t.text :error
      t.references :user, null: true, foreign_key: true

      t.timestamps
    end
  end
end
