import './App.css';
import React from 'react';

// global variables to change where necessary
const DROPDOWN_API_ENDPOINT = 'https://1g12qzycb4.execute-api.us-east-2.amazonaws.com/prod/';
const ML_API_ENDPOINT = 'https://ap6lik2enl.execute-api.us-east-2.amazonaws.com/prod/';


// atob is deprecated but this function converts base64string to text string
const decodeFileBase64 = (base64String) => {
  // From Bytestream to Percent-encoding to Original string
  return "data:image/png;base64," + base64String
  // return decodeURIComponent(
  //   atob(base64String).split("").map(function (c) {
  //     return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
  //   }).join("")
  // );
};


function App() {
  const [inputFileData, setInputFileData] = React.useState(''); // represented as bytes data (string)
  const [outputFileData, setOutputFileData] = React.useState(''); // represented as readable data (text string)
  const [buttonDisable, setButtonDisable] = React.useState(true);
  const [inputImage, setInputImage] = React.useState('');
  const [buttonText, setButtonText] = React.useState('Submit');
  const [submitButtonText, setSubmitButtonText] = React.useState('Submit');
  const [fileButtonText, setFileButtonText] = React.useState('Upload File');
  const [demoDropdownFiles, setDemoDropdownFiles] = React.useState([]);
  const [selectedDropdownFile, setSelectedDropdownFile] = React.useState('');


  // make GET request to get demo files on load -- takes a second to load
  React.useEffect(() => {
    fetch(DROPDOWN_API_ENDPOINT)
    .then(response => response.json())
    .then(data => {
      // GET request error
      if (data.statusCode === 400) {
        console.log('Sorry! There was an error, the demo files are currently unavailable.')
      }

      // GET request success
      else {
        const s3BucketFiles = JSON.parse(data.body);
        setDemoDropdownFiles(s3BucketFiles["s3Files"]);
      }
    });
  }, [])


  // convert file to bytes data
  const convertFileToBytes = (inputFile) => {
    console.log('converting file to bytes...');
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(inputFile); // reads file as bytes data

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  }

  // handle file input
  const handleChange = async (event) => {
    // Clear output text.
    setOutputFileData("");

    console.log('newly uploaded file');
    const inputFile = event.target.files[0];
    console.log(inputFile);

    // convert file to bytes data
    const base64Data = await convertFileToBytes(inputFile);
    const base64DataArray = base64Data.split('base64,'); // need to get rid of 'data:image/png;base64,' at the beginning of encoded string
    const encodedString = base64DataArray[1];
    setInputFileData(encodedString);
    console.log('file converted successfully');

    // enable submit button
    setButtonDisable(false);
  }

  // handle file submission
  const handleSubmit = (event) => {
    event.preventDefault();

    // temporarily disable submit button
    setButtonDisable(true);
    setButtonText('Loading Result');

    // make POST request
    console.log('making POST request...');
    fetch(ML_API_ENDPOINT, {
      method: 'POST',
      headers: { "Content-Type": "application/json", "Accept": "text/plain" },
      body: JSON.stringify({ "image": inputFileData })
    }).then(response => response.json())
    .then(data => {
      console.log('getting response...')
      console.log(data);

      // POST request error
      if (data.statusCode === 400) {
        const outputErrorMessage = JSON.parse(data.errorMessage)['outputResultsData'];
        setOutputFileData(outputErrorMessage);
      }

      // POST request success
      else {
        const outputBytesData = JSON.parse(data.body)['outputResultsData'];
        setOutputFileData(decodeFileBase64(outputBytesData));
      }

      // re-enable submit button
      setButtonDisable(false);
      setButtonText('Submit');
    })
    .then(() => {
      console.log('POST request success');
    })
  }

  // handle demo dropdown file selection
  const handleDropdown = (event) => {
    setSelectedDropdownFile(event.target.value);

    // temporarily disable submit button
    setButtonDisable(true);
    setSubmitButtonText('Loading Demo File...');

    // only make POST request on file selection
    if (event.target.value) {
      fetch(DROPDOWN_API_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ "fileName": event.target.value })
      }).then(response => response.json())
      .then(data => {

        // POST request error
        if (data.statusCode === 400) {
          console.log('Uh oh! There was an error retrieving the dropdown file from the S3 bucket.')
        }

        // POST request success
        else {
          const dropdownFileBytesData = JSON.parse(data.body)['bytesData'];
          setInputFileData(dropdownFileBytesData);
          setInputImage('data:image/png;base64,' + dropdownFileBytesData); // hacky way of setting image from bytes data - even works on .jpeg lol
          setSubmitButtonText('Submit');
          setButtonDisable(false);
        }
      });
    }

    else {
      setInputFileData('');
    }
  }


  return (
    <div className="App">
      <div className="Input">
        <h1>Image Colorization Webapp | Author : Shikhar Gupta</h1>
        <h2>Input Image</h2>
        <div className="Input-Image">
        <label htmlFor="demo-dropdown">Demo: </label>
        <select name="Select Image" id="demo-dropdown" value={selectedDropdownFile} onChange={handleDropdown}>
            <option value="">-- Select Demo File --</option>
            {demoDropdownFiles.map((file) => <option key={file} value={file}>{file}</option>)}
        </select>
        </div>
        <img src={inputImage} alt="" align="center"/>
        <form onSubmit={handleSubmit}>
          <input type="file" accept=".png" onChange={handleChange} />
          <button type="submit" disabled={buttonDisable}>{buttonText}</button>
        </form>
      </div>
      <div className="Output">
        <h2>Output Image</h2>
        <img src={outputFileData} alt="" />
      </div>
    </div>
  );
}

export default App;
