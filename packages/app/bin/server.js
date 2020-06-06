#!/usr/bin/env node

const { exec } = require('child_process');

exec('npm i', {cwd: '../'}, (err, stdout, stderr) => {
    if (!err) {
        console.log('Installed packages.')

        exec('npm run build', {cw: '../'}, (errb, stdoutb, stderrb) => {
            if (!errb) {
                console.log('Completed build.')

                exec('npm run start', {cwd: '../'}, (errs, stdouts, stderrs) => {
                })
            }
        })
    }
})

