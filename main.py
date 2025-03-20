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

client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])
st.title("Macro Guru")

if "thread_id" not in st.session_state:
    thread = client.beta.threads.create(messages=[])
    st.session_state["thread_id"] = thread.id

if "chat_history" not in st.session_state:
    st.session_state["chat_history"] = []

def display_message(role, content):
    with st.chat_message(role):
        st.markdown(content)

for msg in st.session_state["chat_history"]:
    display_message(msg["role"], msg["content"])

user_input = st.chat_input("Ask anything about Macroeconomics...")

if user_input:
    display_message("user", user_input)
    st.session_state["chat_history"].append({"role": "user", "content": user_input})

    client.beta.threads.messages.create(
        thread_id=st.session_state["thread_id"],
        role="user",
        content=user_input
    )

    with st.spinner("Thinking..."):
        run = client.beta.threads.runs.create_and_poll(
            thread_id=st.session_state["thread_id"],
            assistant_id=st.secrets["EXISTING_ASSISTANT_ID"]
        )

    messages = list(
        client.beta.threads.messages.list(thread_id=st.session_state["thread_id"], run_id=run.id)
    )

    assistant_reply = messages[-1]
    final_text = ""
    for block in assistant_reply.content:
        if block.type == "text":
            final_text += block.text.value

    display_message("assistant", final_text)
    st.session_state["chat_history"].append({"role": "assistant", "content": final_text})
