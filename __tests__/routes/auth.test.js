const request = require('request')
const constants = require('../constants.js')

const promisify = (data) => {
    new Promise((resolve, reject) => {
        request.post(data, (err, res, body) => {
            console.log(err, res, body)
            if (err)
                reject(err.message)
            
            resolve(res)
        })
    })
}

describe('Testing auth route', () => {
    test('signup', async () => {
       try {
           const res = await promisify({
                            url: `http://${constants.localhost}:${constants.port}/auth/signup`,
                            form: {
                                email: 'a@a.a', 
                                password: 'lol'
                            }
                        })
            console.log(res)
       } catch(err) {
            console.log(err)
       }
    })
})