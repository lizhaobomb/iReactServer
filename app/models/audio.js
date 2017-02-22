'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

var AudioSchema = new Schema({
	author: {
		type: ObjectId,
		ref: 'User'
	},
	video: {
		type: ObjectId,
		ref: 'Video'
	},

	public_id: String,
	qiniu_video: String,
	qiniu_thumb: String,

	detail: Mixed,
	
	meta:{
		createAt: {
			type: Date,
			default: Date.now()
		},
		updateAt: {
			type: Date,
			default: Date.now()
		}
	}
})

AudioSchema.pre('save', function (next) {
if (this.isNew) {
	this.meta.createAt = this.meta.updateAt = Date.now()
} else {
	this.meta.updateAt = Date.now()
}
next()
})

module.exports = mongoose.model('Audio', AudioSchema)