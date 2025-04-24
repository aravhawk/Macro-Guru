import streamlit as st
from openai import OpenAI
from streamlit_local_storage import LocalStorage
from typing_extensions import override
from openai import AssistantEventHandler


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


st.title("Macro Guru")


with open("system_instructions.txt", "r") as file:
    system_instructions = file.read()


client = OpenAI(
    api_key=st.secrets["OPENAI_API_KEY"]
)


# Your existing assistant ID
assistant_id = st.secrets["ASSISTANT_ID"]


# Load chat data from local storage
stored_data = local_storage.getItem("chat_data")


# Initialize session state
if "messages" not in st.session_state:
    if stored_data and "messages" in stored_data:
        st.session_state["messages"] = stored_data["messages"]
    else:
        st.session_state["messages"] = []


if "thread_id" not in st.session_state:
    if stored_data and "thread_id" in stored_data:
        st.session_state["thread_id"] = stored_data["thread_id"]
    else:
        # Create a new thread when the app loads if none exists
        thread = client.beta.threads.create()
        st.session_state["thread_id"] = thread.id


if "current_response" not in st.session_state:
    st.session_state["current_response"] = ""


# Clear chat button
if st.sidebar.button("Clear Chat History"):
    # Create a new thread
    thread = client.beta.threads.create()
    st.session_state["thread_id"] = thread.id

    # Clear messages for display
    st.session_state["messages"] = []

    # Update local storage
    local_storage.setItem("chat_data", {
        "thread_id": st.session_state["thread_id"],
        "messages": st.session_state["messages"]
    })

    st.rerun()


# Display existing messages
for message in st.session_state["messages"]:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])


prompt = st.chat_input("Ask anything about Macroeconomics...")


if prompt is not None:
    # Add user message to session state and display it
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Add the message to the Assistant API thread
    client.beta.threads.messages.create(
        thread_id=st.session_state["thread_id"],
        role="user",
        content=prompt
    )

    # Create chat message container for assistant response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()

        # Reset current response for new interaction
        st.session_state["current_response"] = ""

        # Define the event handler class
        class MacroGuruEventHandler(AssistantEventHandler):
            @override
            def on_text_created(self, text) -> None:
                # This method is called when text generation begins
                pass

            @override
            def on_text_delta(self, delta, snapshot):
                # This method is called for each new piece of text
                st.session_state["current_response"] += delta.value
                # Update the display with the current response
                message_placeholder.markdown(st.session_state["current_response"] + "⬤")
                message_placeholder.markdown(st.session_state["current_response"])

        # Create and stream the run
        with st.spinner("Thinking..."):
            # Create the run with optional instructions from system_instructions
            with client.beta.threads.runs.stream(
                thread_id=st.session_state["thread_id"],
                assistant_id=assistant_id,
                instructions=system_instructions,
                event_handler=MacroGuruEventHandler(),
            ) as stream:
                stream.until_done()

        # Add the assistant's response to session state messages
        st.session_state["messages"].append({"role": "assistant", "content": st.session_state["current_response"]})

        # Save to local storage - only save messages and thread_id
        local_storage.setItem("chat_data", {
            "thread_id": st.session_state["thread_id"],
            "messages": st.session_state["messages"]
        })
