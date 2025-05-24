from flasgger import swag_from
from flask import Blueprint, jsonify

from app.decorators import roles_required
from app.models import Room

rooms_bp = Blueprint("rooms", __name__)
@rooms_bp.route("/rooms", methods=["GET"])
@roles_required("CD","SG","SEC")
@swag_from({
    'tags': ['Rooms'],
    'summary': 'Returnează toate sălile',
    'responses': {
        200: {
            'description': 'Listă cu toate sălile',
            'examples': {
                'application/json': [
                    {
                        "room_id": 1,
                        "name": "Sala 101",
                    },
                    {
                        "room_id": 2,
                        "name": "Sala 202",
                    }
                ]
            }
        }
    }
})
def get_rooms():
    rooms = Room.query.all()
    rooms_sorted = sorted(rooms, key=lambda room: room.name)
    return jsonify([
        {
            "room_id": room.room_id,
            "name": room.name,
        } for room in rooms_sorted
    ])