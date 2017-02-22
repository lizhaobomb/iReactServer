'use strict'

var mongoose = require('mongoose')
var session = require('koa-session')
var Promise = require('bluebird')
var robot = require('../services/robot')
var config = require('../../config/config')
var Video = mongoose.model('Video')
var Audio = mongoose.model('Audio')

function asyncMedia(videoId, audioId) {
	console.log(videoId)
	console.log(audioId)
	if (!videoId) {
		return
	}

	var query = {
		_id: audioId
	}

	if (!audioId) {
		query = {
			video: videoId
		}
	}

	Promise
	.all([
		Video.findOne({_id: videoId}).exec(),
		Audio.findOne(query).exec()
	])
	.then(function(data) {
		console.log(data)
		var video = data[0]
		var audio = data[1]
		console.log('检查数据有效性')
		if (!video || !video.public_id || !audio || !audio.public_id) {
			return
		}

		console.log('开始同步音频视频')

		var video_public_id = video.public_id
		var audio_public_id = audio.public_id.replace('/', ':')

		var videoName = video_public_id.replace('/', '_') + '.mp4'
		var videoURL = 'http://res.cloudinary.com/lizhao/video/upload/e_volume:-100/e_volume:400,l_video:' 
		+ audio_public_id + '/' + video_public_id + '.mp4'

		var thumbName = video_public_id.replace('/', '_') + '.jpg'
		var thumbURL = 'http://res.cloudinary.com/lizhao/video/upload/' 
		+ video_public_id + '.jpg'

		robot
		.saveToQiniu(videoURL, videoName)
		.catch((error) => {
			console.log(error)
		})
		.then((response) => {
			if (response && response.key) {
				audio.qiniu_video = response.key
				audio.save().then(function(_audio){
					console.log(_audio)
					console.log('同步封面成功')
				})
			}
		})

		robot
		.saveToQiniu(thumbURL, thumbName)
		.catch((error) => {
			console.log(error)
		})
		.then((response) => {
			if (response && response.key) {
				audio.qiniu_thumb = response.key
				audio.save().then(function(_audio){
					console.log(_audio)
					console.log('视频同步成功')
				})
			}
		})
	})

}

exports.audio = function *(next) {
	var body = this.request.body
	var audioData = body.audio
	var videoId = body.videoId
	var user = this.session.user
	if (!audioData || !audioData.public_id) {
		this.body = {
			success: false,
			err: '音频没有上传成功'
		}
		return next
	}

	var audio = yield Audio.findOne({
		public_id: audioData.public_id
	}).exec()

	var video = yield Video.findOne({
		_id: videoId
	}).exec()

	if (!audio) {
		var _audio = {
			author: user._id, 
			public_id: audioData.public_id
		}
		if (video) {
			_audio.video = video._id	
		}
		audio = new Audio(_audio)
		audio = yield audio.save()
	}

	asyncMedia(video._id, audio._id)

	this.body = {
		success: true,
		data: audio._id
	}
}

exports.video = function *(next) {
	var body = this.request.body
	var videoData = body.video
	var user = this.session.user
	if (!videoData || !videoData.key) {
		this.body = {
			success: false,
			err: '视频没有上传成功'
		}
		return next
	}

	var video = yield Video.findOne({
		qiniu_key: videoData.key
	}).exec()

	if (!video) {
		video = new Video({
			author: user._id,
			qiniu_key: videoData.key,
			presistentId: videoData.presistentId
		})
		video = yield video.save()
	}

	var url = config.qiniu.video + video.qiniu_key

	robot
		.uploadToCloudinary(url)
		.then(function(data) {
			if (data && data.public_id) {
				video.public_id = data.public_id
				video.detail = data
				video.save().then(function(_video){
					asyncMedia(_video._id)
				})
			}
		})

	this.body = {
		success: true,
		data: video._id
	}

}

