# README

A bare bones example of wiring a Flask backend and a Vue frontend together with socket.io for offline first webapps.

* install flask and other dependencies
* open and run the notebook to initilize the postgres database
* start flask server:

  ``` bash
    export FLASK_APP=app.py && flask run --reload 
  ```

* visit http://localhost:5000/vue.html, check the console for how changes are made to the state. Open the same page in multiple browsers to see the near instant communication.
