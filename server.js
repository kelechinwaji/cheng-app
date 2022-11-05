const cors = require('cors');
const express = require('express');
const bodyParser = require("body-parser");

const port = process.env.PORT || 1337
const app = express();
const jsonParser = bodyParser.json();
app.use(express.json())

app.use(cors())


app.get('/', (req , res)=>{
 try {
    res.status(200).send({
        "slackUsername":"kelechinwaji",
        "backend":true,
        "age":27,
        "bio":"cycle.code.chaw"})
 } catch (error) {
    res.status(405).send({
        err: "Something went wrong"
    })
 }
})

const mathType = {
    addition: "+",
    subtraction: "-",
    multiplication: "*"
}

app.post("/", (req, res)=>{
    const {operation_type, x, y} = req.body;
    const a = Number(x);
    const b = Number(y);
   if(!mathType[operation_type]){
    res.status(405).json({
        success: false,
        msg: "method not allowed"
    });
   } else{
    result = 0;
    if(operation_type == "addition"){
        result = a + b;
    } else if (operation_type == "subtraction"){
        result = a - b;
    } else {
        result = a * b;
    } 

    const data = {
        slackUsername: "kelechinwaji",
        operation_type: operation_type,
        result: result,
    };
    res.status(200).json(data);
   }
   
});

app.listen(port, ()=>{
    console.log(`App is running on ${port}`);
});