'use strict'

var mongoose = require('mongoose')
var session = require('koa-session')
var User = mongoose.model('User')

exports.signature = function *(next) {
	this.body = {
		success: true
	}
}

exports.hasBody = function *(next) {
	var body = this.request.body || {}
	if (Object.keys(body).length === 0) {
		this.body = {
			success: false,
			err: '是不是漏掉了什么了'
		}
		return next
	}
	yield next
}

exports.hasToken = function *(next) {
	var accessToken = this.query.accessToken
	if (!accessToken) {
		var accessToken = this.request.body.accessToken
	}

	if (!accessToken) {
		this.body = {
			success: false,
			err: '钥匙丢了'
		}
		return next
	}

	var user = yield User.findOne({
		accessToken: accessToken
	}).exec()

	if (!user) {
		this.body = {
			success: false,
			err: '用户未登录'
		}
		return next
	}

	this.session = this.session || {}
	this.session.user = user
	yield next
}

