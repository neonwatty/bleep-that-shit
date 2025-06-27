class CreateBleepConfigs < ActiveRecord::Migration[8.0]
  def change
    create_table :bleep_configs do |t|
      t.string :name
      t.string :bleep_sound
      t.float :pre_padding
      t.float :post_padding
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
