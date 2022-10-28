const cors = require('cors')
const express = require('express')

const port = process.env.PORT || 1337
const app = express();

app.use(cors())


app.get('/', (req , res)=>{
 try {
    res.status(200).send({
        "slackUsername":"Kelechi Nwaji",
        "backend":true,
        "age":27,
        "bio":"cycle.code.chaw"})
 } catch (error) {
    res.status(405).send({
        err: "Something went wrong"
    })
 }
})


app.listen(port, ()=>{
    console.log(`App is running on ${port}`);
})



