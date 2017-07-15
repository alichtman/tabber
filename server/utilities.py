from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo
import sys

# TODO: Rewrite anything that uses folders to use new find_folder() function



# GETTING

def get_all_content_recursive(mongo, folder):
	if folder is None:
		return

	# Gathers all conversations in the folder
	conversation_list = []
	for conversation_id in folder["conversations"]:
		conversation = mongo.db.conversations.find_one({"_id": conversation_id})
		conversation_list.append({"name": conversation["name"], "messages": conversation["messages"]})

	# Recursively traverses subfolders
	children_list = []
	for subfolder in folder["children"]:
		subfolder_id = mongo.db.folders.find_one({"_id": subfolder})
		children_list.append(get_all_content_recursive(mongo, subfolder_id))

	return {"name": folder["name"], "conversations": conversation_list, "children": children_list}


# TODO: Make this not atrociously inefficient
def get_all_content(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	# TODO: Add "root" as a property for folders so that we can rename the top-level folder
	root_folder = mongo.db.folders.find_one({"user_id": user["_id"], "root": True})

	if root_folder:
		return [get_all_content_recursive(mongo, root_folder)]

	abort(500, "get_all_content(): root folder for user " + user["email"] + " doesn't exist")
	return None


def get_folders(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder_name_list = []
	for folder in mongo.db.folders.find({"user_id": user["_id"]}):
		folder_name_list.append(folder["name"])
	return folder_name_list


def get_database(mongo):
	users = []
	folders = []
	conversations = []

	for u in mongo.db.users.find():
		users.append({
			"_id": str(u["_id"]),
			"email": u["email"],
			"password": u["password"],
			"root": str(u["root"])
		})
	for f in mongo.db.folders.find():
		folders.append({
			"_id": str(f["_id"]),
			"user_id": str(f["user_id"]),
			"name": f["name"],
			"children": f["children"],
			"conversations": f["conversations"]
		})
	for c in mongo.db.conversations.find():
		conversations.append({
			"_id": str(c["_id"]),
			"name": c["name"],
			"messages": c["messages"]
		})

	return users, folders, conversations



# ADDING

def add_user(mongo, request_json):
	for u in mongo.db.users.find():
		if u["email"] == request_json["email"]:
			return False;

	root_id = mongo.db.folders.insert({
		"name": "Everything",
		"root": True,
		"children": [],
		"conversations": []
	})
	user_id = mongo.db.users.insert({
		"email": request_json["email"],
		"password": request_json["password"],
		"root": root_id
	})
	mongo.db.folders.update_one({
		"_id": root_id},
		{"$set": {"user_id": ObjectId(str(user_id))}
	}, upsert=False)

	return True;


# Adds folder under a specified parent folder
# TODO: Check that we don't add duplicate folders
def add_folder(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder_id = mongo.db.folders.insert({
		"name": request_json["name"],
		"root": False,
		"children": [],
		"conversations": [],
		"user_id": ObjectId(str(user["_id"]))
	})
	parentFolder = mongo.db.folders.update_one({
		"name": request_json["parent"],
		"user_id": ObjectId(str(user["_id"]))},
		{"$push": {"children": ObjectId(str(folder_id))}
	}, True)

	return str(folder_id)


def add_conversation(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder = mongo.db.folders.find_one({"name": request_json["folder"], "user_id": ObjectId(str(user["_id"]))})
	convo = {
		"name": request_json["name"],
		"messages": request_json["messages"],
		"folder": folder["_id"]
	}
	convo_id = mongo.db.conversations.insert(convo)
	mongo.db.folders.update_one({
		"_id": folder["_id"]},
		{"$push": {"conversations": ObjectId(str(convo_id))}
	}, True)

	return str(convo_id)



# EDITING

def rename_folder(mongo, request_json):
	mongo.db.folders.update_one({
		"name": request_json["name"]},
		{"$set": {"name": request_json["newName"]}
		}, True)
	return True

def move_folder(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None

	folder, parent = find_folder(user["_id"], request_json["path"], parent=True)
	new_parent = find_folder(user["_id"], request_json["newParentPath"])
	if folder == None or parent == None or new_parent == None:
		return False

	new_parent = mongo.db.folders.update_one({"_id": new_parent["_id"]},
		{"$push": {"children": ObjectId(str(folder["_id"]))}
	}, True)
	parent = mongo.db.folders.update_one({"_id": parent["_id"]},
		{"$pull": {"children": ObjectId(str(folder["_id"]))}
	}, True)

	return True

def move_conversation(mongo, request_json):
	user = mongo.db.users.find_one({"email": request_json["email"]})
	if not user_exists(user): return None



# DELETING

# TODO: Also remove from parent folder's conversations list
# TODO: Use email to filter results
def delete_conversation(mongo, request_json):
	for conversation in mongo.db.conversations.find({"name": request_json["name"]}):
		mongo.db.conversations.remove(conversation["_id"])
	return True


# TODO: Make this not horribly inefficient
# TODO: Fix duplicate parent-child bug
# TODO: Use email to filter results
def delete_folder(mongo, request_json):
	for folder in mongo.db.folders.find({"name": request_json["parent"]}):
		for subfolder_id in folder["children"]:
			subfolder = mongo.db.folders.find_one({"_id": subfolder_id})
			if subfolder["name"] == request_json["name"]:
				# Don't delete the root folder
				if subfolder["root"]:
					return
				mongo.db.folders.remove(subfolder_id)
				# folder["children"].remove(subfolder_id)
				# print("folder['_id']: " + str(folder["_id"]))
				# print("subfolder_id: " + str(subfolder_id))
				mongo.db.folders.update({"_id": folder["_id"]}, {"$pull": {"children": subfolder_id}})
				return
	return True



# MISCELLANEOUS

def check_user(mongo, request_json):
	for u in mongo.db.users.find():
		if u["email"] == request_json["email"] and u["password"] == request_json["password"]:
			return True
	return False


# Gets rid of some boilerplate I didn't want to write for each function
def user_exists(user):
	if not user:
		abort(401, str(sys._getframe(1).f_code.co_name) + "(): user doesn't exist or isn't logged in")
		return False
	return True


# Retrieves the final folder object in a filepath and, if specified, its parent
def find_folder(user_id, path, parent=False):
	root_folder = mongo.db.folders.find_one({"user_id": user_id, "root": True})
	cur_folder = root_folder
	prev = root_folder
	for folder_name in path.split("/")[1:]:
		child_found = False
		for subfolder_id in cur_folder["children"]:
			subfolder = mongo.db.folders.find_one({"user_id": user_id, "_id": subfolder_id, "name": folder_name})
			if subfolder is not None:
				prev = cur_folder
				cur_folder = subfolder
				child_found = True
				break
		if not child_found:
			print("ERROR: Could not find specified folder. Last correct folder name was " + str(cur_folder["name"]))
			if parent: return None, None
			else: return None
	if parent: return cur_folder, prev
	else: return cur_folder




# TODO: Remove authToken from these tests
if __name__ == "__main__":

	AUTH_ID = u'ya29.Glx6BP2MHLV0xcegcsPzy378uZmJo4kgygGturW8jrGCC80ygI8BcxhezpQhAXFjd4pK6Z1sDdHWq8N1P04DSh2H1zOJ18uvLyNAX3u50fCEdPufK7R5eXIkiyUP7g'
	EMAIL = "matthewrastovac@gmail.com"

	import pprint
	pp = pprint.PrettyPrinter(indent=2)

	app = Flask(__name__)
	app.config['MONGO_DBNAME'] = 'tabberdb'
	app.config['MONGO_URI'] = 'mongodb://localhost:27017/tabberdb'
	mongo = PyMongo(app)

	with app.app_context():
		# request_json = {"email": EMAIL}
		# pp.pprint(get_all_content(mongo, request_json))

		# request_json = {"parent": "root", "name": "New Folder", "email": EMAIL}
		# print("Added folder: " + add_folder(mongo, request_json))

		# request_json = {"name": "New Folder", "newName": "Renamed Folder", "email": EMAIL}
		# print("Renamed folder status: " + str(rename_folder(mongo, request_json)

		# request_json = {"name": "Works for me", "email": EMAIL}
		# print("Removed conversation status: " + str(delete_conversation(mongo, request_json)))

		# request_json = {"name": "New Folder", "parent": "root", "newParent": "root", "email": EMAIL}
		# print("Removed folder status: " + str(delete_folder(mongo, request_json)))

		request_json = {"path": "Every/Sub1","newParentPath": "Every/New Folder", "email": "matthewrastovac@gmail.com"}
		print("Moved folder status: " + str(move_folder(mongo, request_json)))
