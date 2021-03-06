'use strict'

var mongoose = require('mongoose')
var session = require('koa-session')
var xss = require('xss')
var uuid = require('uuid')
var sms = require('../services/sms')

var User = mongoose.model('User')

exports.signup = function *(next) {
	var phoneNumber = xss(this.request.body.phoneNumber.trim())
	
	var user = yield User.findOne({
		phoneNumber: phoneNumber
	}).exec()

	var verifyCode = sms.getCode()

	if (!user) {
		var accessToken = uuid.v4()
		user = new User({
			phoneNumber: xss(phoneNumber),
			verifyCode: verifyCode,
			accessToken: accessToken,
			nickname: '哈哈哈',
			avatar: 'http://7xibfi.com1.z0.glb.clouddn.com/user_avatar/bbs.iosre.com/lanvsblue/120/2807_1.png'
		})
	} else {
		user.verifyCode = '1212'
	}

	try {
		user = yield user.save()
	} 
	catch(e) {
		this.body = {
			success: false
		}
		return next
	}

	var msg = '您的注册验证码是：' + verifyCode
	try {

		sms.send(user.phoneNumber, msg)
	}
	catch (e) {
		console.log(e)
		this.body = {
			success: false,
			err: '短信服务异常'
		}
		return next
	}

	this.body = {
		success: true
	}
}

exports.verify = function *(next) {
	var verifyCode = this.request.body.verifyCode
	var phoneNumber = this.request.body.phoneNumber
	if (!verifyCode || !phoneNumber) {
		this.body = {
			success: false,
			err: '验证没通过'
		}
		return next
	}

	var user = yield User.findOne({
		phoneNumber: phoneNumber,
		verifyCode: verifyCode
	}).exec()

	if (user) {
		user.verified = true
		user = yield user.save()

		this.body = {
			success: true,
			data: {
				nickname: user.nickname,
				accessToken: user.accessToken,
				avatar: user.avatar,
				_id: user._id
			}
		}

	} else {
		this.body = {
			success: false,
			err: '验证未通过'
		}
	}
}

exports.update = function *(next) {

	var body = this.request.body
	var user = this.session.user
	var fields = 'avatar,gender,age,nickname,breed'.split(',')

	fields.forEach(function(field) {
		if (body[field]) {
			user[field] = xss(body[field].trim())
		}
	})

	user = yield user.save()

	this.body = {
		success: true,
		data: {
			nickname: user.nickname,
			accessToken: user.accessToken,
			avatar: user.avatar,
			age: user.age,
			breed: user.breed,
			gender: user.gender,
			_id: user._id
		}
	}
}

