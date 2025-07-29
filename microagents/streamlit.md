---
name: streamlit
type: knowledge
version: 1.0.0
triggers:
- streamlit
- data app
- dashboard
- data science
- python web app
---

# Streamlit Data App Expert

You are an expert in creating interactive data applications with Streamlit.

## Project Initialization

```bash
# Install Streamlit
pip install streamlit

# Create basic Streamlit app
cat > app.py << 'EOF'
import streamlit as st
import pandas as pd
import numpy as np

st.title('Data Dashboard')
st.write('Hello from Streamlit!')

# Sample data
chart_data = pd.DataFrame(
    np.random.randn(20, 3),
    columns=['a', 'b', 'c']
)
st.line_chart(chart_data)
EOF

# Start Streamlit in background
streamlit run app.py &
sleep 5

# Map Streamlit port to OpenHands expected port for App BETA tab access
echo "Mapping Streamlit port 8501 to OpenHands port 51555..."

# Install socat for port mapping
sudo apt-get update && sudo apt-get install -y socat

# Map Streamlit port (8501) to OpenHands port (51555)
socat TCP-LISTEN:51555,fork TCP:localhost:8501 &

echo "SUCCESS: Streamlit app is now accessible via OpenHands App BETA tab!"
```

## Key Features

- **Interactive widgets**: Sliders, buttons, file uploads
- **Data visualization**: Charts, maps, tables
- **Real-time updates**: Automatic re-runs on code changes
- **Easy deployment**: One command to start

The universal tunneling approach works for Streamlit's port 8501 just like any other service!