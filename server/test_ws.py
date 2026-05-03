import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/ws/analyze"
    async with websockets.connect(uri) as websocket:
        # Load CSV
        with open("heart_failure_readmission_dataset.csv", "r") as f:
            csv_text = f.read()
        
        print("Sending CSV...")
        await websocket.send(csv_text)
        
        while True:
            try:
                response = await websocket.recv()
                data = json.loads(response)
                
                if data.get("type") == "STATUS":
                    print(f"Status update: {data.get('stage')}")
                elif data.get("type") == "FINAL_RESULT":
                    print("\nFinal Result Received!")
                    print(f"Axes: {data.get('axes')}")
                    print(f"Stats: {data.get('stats')}")
                    print(f"Insight: {json.dumps(data.get('insight'), indent=2)}")
                    break
                else:
                    print(f"Other response: {data}")
            except Exception as e:
                print(f"Error or closed: {e}")
                break

if __name__ == "__main__":
    asyncio.run(test_ws())
