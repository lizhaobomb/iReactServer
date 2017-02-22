'use strict'

var qiniu = require('qiniu')
var cloudinary = require('cloudinary')
var sha1 = require('sha1')
var config = require('../../config/config')
var uuid = require('uuid')

var Promise = require('bluebird')

qiniu.conf.ACCESS_KEY = config.qiniu.AK
qiniu.conf.SECRET_KEY = config.qiniu.SK

cloudinary.config(config.cloudinary)

exports.getQiniuToken = function(body) {
	var type = body.type
	var putPolicy
	var key = uuid.v4()
	var options = {
		presistentNotifyUrl: config.notify
	}
	if (type === 'avatar') {
	// putPolicy.callbackUrl = 'http://your.domain.com/callback'
	// putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)'
		key += '.png'
		putPolicy = new qiniu.rs.PutPolicy('avatar:' + key);
	} 
	else if(type === 'video') {
		key += '.mp4'
		options.scope = 'baobaovideo:' + key
		options.persistentOps = 'avthumb/mp4/an/1' 
		putPolicy = new qiniu.rs.PutPolicy2(options)
	} 
	else if(type === 'audio') {

	}
	var token = putPolicy.token()
	return {
		key: key,
		token: token
	}
}

exports.getCloudinaryToken = function(body) {

	var type = body.type
	var timestamp = body.timestamp
	var folder
	var tags

	if (type === 'avatar') {
		folder = 'avatar'
		tags = 'app,avatar'
	}
	else if (type === 'video') {
		folder = 'video'
		tags = 'app,video'
	}
	else if (type === 'audio') {
		folder = 'audio'
		tags = 'app,audio'
	}

	var signature = 'folder=' + folder + '&tags=' + tags + 
		'&timestamp=' + timestamp + config.cloudinary.api_secret

	var key = uuid.v4()
	signature = sha1(signature)

	return {
		token:signature,
		key: key
		}
}

exports.uploadToCloudinary = function(url) {
	return new Promise(function(resolve, reject) {
		cloudinary.uploader.upload(url, function(result) {
			console.log(result)
				if (result && result.public_id) {
					resolve(result)
				}
				else {
					reject(result)
				}
		}, {
				resource_type: 'video',
				folder: 'video'
			})
	})
}

