import streamlit as st
from openai import OpenAI

st.set_page_config(
    page_title="Macro Guru",
    page_icon=":bar_chart:",
    layout="centered",
    menu_items={
        'Get help': 'mailto:support@aravhawk.com?subject=Need%20Help%20with%Macro%20Guru',
        'Report a bug': 'mailto:bugs@aravhawk.com?subject=Macro%20Guru%20Bug%20Report',
        'About': '''### Ace all your macro tests with Macro Guru! \n
        https://macroguru.aravhawk.com'''
    }
)

st.title("Macro Guru")

client = OpenAI(
    base_url="https://api.x.ai/v1",
    api_key=st.secrets["XAI_API_KEY"]
)

model = "grok-2-latest"

with open('system_instructions.txt') as file:
    system_instructions = file.read()

try:
    with open('./knowledge_text.txt', 'r', encoding='utf-8') as file:
        knowledge_text = file.read()
except FileNotFoundError:
    st.error("Knowledge base file not found. Please run generate_knowledge.py first to create the knowledge base.")
    knowledge_text = "No knowledge base available."

full_instructions = f"{system_instructions}\n\n# KNOWLEDGE BASE\n{knowledge_text}"

if "messages" not in st.session_state:
    st.session_state["messages"] = []

for message in st.session_state["messages"]:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

prompt = st.chat_input("Ask anything about Macroeconomics...")

if prompt is not None:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        first_response_received = False

        response_generator = client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": full_instructions}] +
                     [{"role": m["role"], "content": m["content"]} for m in st.session_state["messages"]],
            stream=True
        )

        with st.spinner("Thinking..."):
            for response in response_generator:
                incremental_content = response.choices[0].delta.content or ""
                full_response += incremental_content

                if not first_response_received and incremental_content:
                    first_response_received = True
                    break

        message_placeholder.markdown(full_response)

        for response in response_generator:
            incremental_content = response.choices[0].delta.content or ""
            full_response += incremental_content
            message_placeholder.markdown(full_response + "⬤")
            message_placeholder.markdown(full_response)

        st.session_state["messages"].append({"role": "assistant", "content": full_response})
