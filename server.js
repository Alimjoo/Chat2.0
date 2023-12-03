const express = require('express');
const cors = require('cors'); // Import the cors middleware
const fs = require('fs');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors()); 

// Middleware to parse JSON in POST requests
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  service : 'hotmail',
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "amichaelomar@outlook.com",
    pass: "Alim0323",
  }
});

const option ={
  from : "amichaelomar@outlook.com",
  to :"alimjooomar@gmail.com",
  subject:"test",
  text:"test text"
}
function send_email(name, model, text){
  option.subject = name + ' ' + model;
  option.text = text;
  transporter.sendMail(option, (err, info)=>{
    if (err){
      console.log(err);
      return;
    }
    console.log("Send " + info.response);
  })
}
// send_email("alim", 'gpt-4', "helllo");

app.post('/send_email', (req, res) => {
  const { name, model, text} = req.body; // Extract both name and newValue from the request body
  send_email(name, model, text);
});

// // Define a POST route to update the "hello" value in the JSON file
// app.post('/update_subs', (req, res) => {
//   const { name, newValue, model } = req.body; // Extract both name and newValue from the request body

//   if (!name || newValue === undefined) {
//     return res.status(400).json({ error: 'Both name and newValue are required.' });
//   }
//   fs.readFile('.subs.json', 'utf8', (err, data) => {
//     if (err) {
//       console.error('Error reading file:', err);
//       return res.status(500).json({ error: 'Unable to read the file.' });
//     }
//     try {
//       const jsonData = JSON.parse(data);
//       // Update the value associated with the provided name
//       if (jsonData[name]){
//         if (model == 'gpt-4'){
//           jsonData[name][1] = jsonData[name][1] - Math.abs(newValue);
//         }else{
//           jsonData[name][0] = jsonData[name][0] - Math.abs(newValue);
//         }
//         fs.writeFile('.subs.json', JSON.stringify(jsonData, null, 2), (err) => {
//           if (err) {
//             console.error('Error writing to file:', err);
//             return res.status(500).json({ error: 'Unable to write to file.' });
//           }
//         });
//       }
//     } catch (error) {
//       console.error('Error parsing JSON:', error);
//       return res.status(500).json({ error: 'Unable to parse JSON data.' });
//     }
//   });
// });


// Define an endpoint to read a value from the JSON file
// app.get('/get_remain_subs/:name', (req, res) => {
//   const { name } = req.params;

//   // Read the JSON file
//   fs.readFile('.subs.json', 'utf8', (err, data) => {
//     if (err) {
//       console.error('Error reading file:', err);
//       return res.status(500).json({ error: 'Unable to read the file.' });
//     }
//     try {
//       // Parse the JSON data
//       const jsonData = JSON.parse(data);

//       // Check if the name exists in the JSON data
//       if (jsonData.hasOwnProperty(name)) {
//         const message = jsonData[name];
//         // console.log(message);
//         res.json({ message });
//       } else {
//         res.status(404).json({ error: `Name '${name}' not found in JSON data.` });
//       }
//     } catch (error) {
//       console.error('Error parsing JSON:', error);
//       res.status(500).json({ error: 'Unable to parse JSON data.' });
//     }
//   });
// });

app.get('/get_remain_subs/:name', (req, res) => {
  const { name } = req.params;

  // Read the JSON file
  fs.readFile('./.subs/' + name + '.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Unable to read the file.' });
    }
    try {
      // Parse the JSON data
      const jsonData = JSON.parse(data);
      const message = jsonData[name];
      // console.log(message);
      res.json({ message });
    } catch (error) {
      console.error('Error parsing JSON:', error);
      res.status(500).json({ error: 'Unable to parse JSON data.' });
    }
  });
});


app.post('/update_subs', (req, res) => {
  const { name, newValue, model } = req.body; // Extract both name and newValue from the request body

  if (!name || newValue === undefined) {
    return res.status(400).json({ error: 'Both name and newValue are required.' });
  }
  fs.readFile('./.subs/' + name + '.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Unable to read the file.' });
    }
    try {
      const jsonData = JSON.parse(data);
      // Update the value associated with the provided name
      if (model == 'gpt-4'){
        jsonData[name][1] = jsonData[name][1] - Math.abs(newValue);
      }else{
        jsonData[name][0] = jsonData[name][0] - Math.abs(newValue);
      }
      fs.writeFile('./.subs/' + name + '.json', JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
          console.error('Error writing to file:', err);
          return res.status(500).json({ error: 'Unable to write to file.' });
        }
        res.status(200).json({ success: true });
      });
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return res.status(500).json({ error: 'Unable to parse JSON data.' });
    }
  });
});


// const PORT = process.env.PORT || 300;
const PORT = 299;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});