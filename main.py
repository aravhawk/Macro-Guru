from altair import Key
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
        'About': '''### Ace all your AP Macro tests with Macro Guru! \n
        https://macroguru.aravhawk.com'''
    }
)

if "clear_chat_requested" in st.session_state and st.session_state["clear_chat_requested"]:
    try:
        local_storage.deleteItem("chat_history")
        st.session_state["clear_chat_requested"] = False
        st.session_state["messages"] = []
    except KeyError:
        pass

st.title("Macro Guru")

with open("system_instructions.txt", "r") as file:
    system_instructions = file.read()

client = OpenAI(
    api_key=st.secrets["OPENAI_API_KEY"]
)

model = "gpt-4.1-nano"

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

        response_generator = client.responses.create(
            model=model,
            input=[{"role": "system", "content": system_instructions}] +
                     [{"role": m["role"], "content": m["content"]} for m in st.session_state["messages"]],
            tools=[{
                "type": "file_search",
                "vector_store_ids": [st.secrets["VECTOR_STORE_ID"]],
            }],
            store=True,
            stream=True
        )

        with st.spinner("Thinking..."):
            for response in response_generator:
                if getattr(response, "type", None) == "response.output_text.delta":
                    incremental_content = response.delta or ""
                    full_response += incremental_content

                    if not first_response_received and incremental_content:
                        first_response_received = True
                        break

        message_placeholder.markdown(full_response)

        for response in response_generator:
            if getattr(response, "type", None) == "response.output_text.delta":
                incremental_content = response.delta or ""
                full_response += incremental_content
                message_placeholder.markdown(full_response + "⬤")
                message_placeholder.markdown(full_response)

        st.session_state["messages"].append({"role": "assistant", "content": full_response})

        local_storage.setItem("chat_history", st.session_state["messages"])
