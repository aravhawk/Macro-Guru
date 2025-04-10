import streamlit as st
from openai import OpenAI
from streamlit_local_storage import LocalStorage


def init_local_storage():
    return LocalStorage()


local_storage = init_local_storage()

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

if "clear_chat_requested" in st.session_state and st.session_state["clear_chat_requested"]:
    local_storage.deleteItem("chat_history")
    st.session_state["clear_chat_requested"] = False
    st.session_state["messages"] = []

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

stored_messages = local_storage.getItem("chat_history")

if "messages" not in st.session_state:
    if stored_messages:
        st.session_state["messages"] = stored_messages
    else:
        st.session_state["messages"] = []

if "clear_chat_requested" not in st.session_state:
    st.session_state["clear_chat_requested"] = False

if st.sidebar.button("Clear Chat History"):
    st.session_state["clear_chat_requested"] = True
    st.session_state["messages"] = []
    st.rerun()

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

        local_storage.setItem("chat_history", st.session_state["messages"])