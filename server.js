const cors = require('cors')
const express = require('express')

const port = process.env.PORT || 1337
const app = express();

app.use(cors())


app.get("/api/v1/info", (req , res)=>{
 try {
    res.status(200).send({
        "slackUsername":"Kelechi Nwaji",
        "backend":true,
        "age":911,
        "bio":"cycle.code.chaw"})
 } catch (error) {
    res.status(405).send({
        err: "Something went wrong"
    })
 }
})

app.all('*', (req, res, next)=>{
    res.status(404).json({
        success: false,
        message: "path not found"
     })
})

app.listen(port, ()=>{
    console.log(`App is running on ${port}`);
})



