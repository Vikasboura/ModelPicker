import io


def test_create_and_list_datasets(client):
    payload = {
        "name": "Custom Coding Eval",
        "description": "Eval set for Python snippets",
        "items": [
            {
                "id": "code-1",
                "prompt": "Write a function to add two numbers.",
                "expected": "def add(a, b): return a + b",
            }
        ],
    }
    create_res = client.post("/api/v1/datasets", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name"] == "Custom Coding Eval"
    assert created_data["row_count"] == 1
    ds_id = created_data["id"]

    # List datasets
    list_res = client.get("/api/v1/datasets")
    assert list_res.status_code == 200
    assert any(d["id"] == ds_id for d in list_res.json())

    # Get dataset by id
    get_res = client.get(f"/api/v1/datasets/{ds_id}")
    assert get_res.status_code == 200
    assert len(get_res.json()["items"]) == 1


def test_validate_and_upload_jsonl(client):
    jsonl_content = (
        '{"id": "p1", "prompt": "What is Python?", "expected": "A high-level programming language."}\n'
        '{"id": "p2", "prompt": "What is FastAPI?", "expected": "A modern web framework for Python."}\n'
    )
    file_bytes = io.BytesIO(jsonl_content.encode("utf-8"))

    # 1. Validate endpoint
    val_res = client.post(
        "/api/v1/datasets/validate",
        files={"file": ("test.jsonl", file_bytes, "application/jsonl")},
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is True
    assert val_data["valid_rows"] == 2
    assert len(val_data["preview"]) == 2

    # 2. Upload endpoint
    file_bytes.seek(0)
    upload_res = client.post(
        "/api/v1/datasets/upload",
        data={"name": "JSONL Upload Test", "description": "Testing JSONL"},
        files={"file": ("test.jsonl", file_bytes, "application/jsonl")},
    )
    assert upload_res.status_code == 201
    assert upload_res.json()["row_count"] == 2


def test_validate_invalid_json(client):
    invalid_content = "This is not json at all."
    file_bytes = io.BytesIO(invalid_content.encode("utf-8"))

    val_res = client.post(
        "/api/v1/datasets/validate",
        files={"file": ("bad.json", file_bytes, "application/json")},
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is False
    assert len(val_data["errors"]) > 0
