/**
 * @swagger
 * definitions:
 *   User:
 *     properties:
 *       userid:
 *         type: integer
 *       username:
 *         type: string
 *       password:
 *         type: string
 *       email:
 *         type: string
 * 
 *   Registration:
 *     properties:
 *       username:
 *         type: string
 *       password:
 *         type: string
 *       email:
 *         type: string
 * 
 *   Login:
 *     properties:
 *       username:
 *         type: string
 *       password:
 *         type: string
 * 
 *   HandwrittenConversion:
 *     properties:
 *       imgUrl:
 *         type: string
 * 
 *   UserDeletion:
 *     properties:
 *       userid:
 *         type: integer
 * 
 *   ForgotPassword:
 *     properties:
 *       email:
 *         type: string
 *       username:
 *         type: string
 * 
 *   ResetPassword:
 *     properties:
 *       token:
 *         type: string
 *       password:
 *         type: string
 * 
 * @swagger
 * /api/v1/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: body
 *         name: registration
 *         description: Registration information
 *         required: true
 *         schema:
 *           $ref: '#/definitions/Registration'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * /api/v1/login:
 *   post:
 *     summary: Authenticate and log in a user
 *     tags:
 *       - User
 *     parameters:
 *       - in: body
 *         name: login
 *         description: Login information
 *         required: true
 *         schema:
 *           $ref: '#/definitions/Login'
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 * 
 * @swagger
 * /api/v1/stats:
 *   get:
 *     summary: Retrieve the number of times every endpoint was used
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: Successful response
 *       403:
 *         description: Not an admin
 *       500:
 *         description: Internal server error
 * @swagger
 * /api/v1/consumption:
 *   get:
 *     summary: Retrieve the number of API calls by every user
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: Successful response
 *       403:
 *         description: Not an admin
 *       500:
 *         description: Internal server error
 * @swagger
 * /api/v1/convert_handwritten:
 *   post:
 *     summary: Convert a handwritten text image to typed text
 *     tags:
 *       - Conversion
 *     parameters:
 *       - in: body
 *         name: conversion
 *         description: Handwritten conversion information
 *         required: true
 *         schema:
 *           $ref: '#/definitions/HandwrittenConversion'
 *     responses:
 *       200:
 *         description: Handwritten image converted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not logged in
 *       500:
 *         description: Internal server error
 * @swagger
 * /api/v1/user:
 *   delete:
 *     summary: Delete a user based on userid
 *     tags:
 *       - User
 *     parameters:
 *       - in: body
 *         name: userDeletion
 *         description: User deletion information
 *         required: true
 *         schema:
 *           $ref: '#/definitions/UserDeletion'
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not an admin
 *       500:
 *         description: Internal server error
 * @swagger
 * /api/v1/forgot_password:
 *   post:
 *     summary: Sends an email that initiates a password reset
 *     tags:
 *       - User
 *     parameters:
 *       - in: body
 *         name: forgotPassword
 *         description: Forgot password information
 *         required: true
 *         schema:
 *           $ref: '#/definitions/ForgotPassword'
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 * @swagger
 * /api/v1/reset_password:
 *   patch:
 *     summary: Resets user's password
 *     tags:
 *       - User
 *     parameters:
 *       - in: body
 *         name: resetPassword
 *         description: Reset password information
 *         required: true
 *         schema:
 *           $ref: '#/definitions/ResetPassword'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
