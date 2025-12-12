from fastapi.testclient import TestClient
from src.app import app, activities


client = TestClient(app)


def test_get_activities_returns_200_and_dict():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # check a known activity exists
    assert "Chess Club" in data


def test_signup_increases_participants_and_returns_message():
    activity_name = "Tennis Club"
    email = "teststudent@mergington.edu"

    # Ensure not already present
    if email in activities[activity_name]["participants"]:
        activities[activity_name]["participants"].remove(email)

    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 200
    json = resp.json()
    assert "Signed up" in json.get("message", "")
    assert email in activities[activity_name]["participants"]


def test_unregister_removes_participant_and_returns_message():
    activity_name = "Tennis Club"
    email = "teststudent@mergington.edu"

    # Ensure participant is present
    if email not in activities[activity_name]["participants"]:
        activities[activity_name]["participants"].append(email)

    resp = client.delete(
        f"/activities/{activity_name}/unregister?email={email}"
    )
    assert resp.status_code == 200
    json = resp.json()
    assert "Unregistered" in json.get("message", "")
    assert email not in activities[activity_name]["participants"]
