from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO, emit
from sqlalchemy import func
from sqlalchemy.types import DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://postgres:abc@localhost:5432/flask"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'secret!'
app.jinja_env.add_extension('pyjade.ext.jinja.PyJadeExtension')
db = SQLAlchemy(app)
socketio = SocketIO(app)


class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(JSONB)
    modified = db.Column(DateTime,
                         server_default=func.now(),
                         onupdate=func.current_timestamp())

    def __repr__(self):
        return f'<Item {self.id}@{self.modified}>'


@app.route('/<string:page_name>.jade/')
def static_page_jade(page_name):
    return render_template('%s.jade' % page_name)


@app.route('/<string:page_name>.html/')
def static_page_html(page_name):
    return send_from_directory('', '%s.html' % page_name)


@app.route('/<string:page_name>.js/')
def static_page_js(page_name):
    return send_from_directory('', '%s.js' % page_name)


@socketio.on('send items', namespace='/test')
def send_items():
    print('send items')
    emit('receive items', {item.id: item.data
                           for item in db.session.query(Item).all()})


@socketio.on('update item', namespace='/test')
def test_message(data):
    print('update item', data)
    item = Item.query.get(data['id'])

    # verify
    if 'x' in data['value']['letters']:
        data = {
            'id': data['id'],
            'rejected': data['value'],
            'reason': 'contains x',
        }
        emit('reject update', data)
        return

    item.data = data['value']
    db.session.commit()
    emit('update item', data, broadcast=True)


@socketio.on('my broadcast event', namespace='/test')
def test_message(message):
    print('my broadcast event')
    emit('my response', message, broadcast=True)


@socketio.on('connect', namespace='/test')
def test_connect():
    print('Client connected')
    emit('my response', {'data': 'Connected'})


@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected')
