import streamlit as st
from PIL import Image

st.markdown("""
<style>

/* Background */
[data-testid="stAppViewContainer"] {
    background-color: #FCF8F8;
}

/* Container */
.main {
    background-color: rgba(255, 255, 255, 0.88);
    padding: 30px;
    border-radius: 15px;
}

/* Title */
h1 {
    text-align: center;
    color: #2c3e50;
}

/* Subjudul */
h2, h3 {
    text-align: center;
    color: #2c3e50;
}

/* Input */
.stTextInput>div>div>input {
    border-radius: 10px;
    border: 1px solid #ccc;
    padding: 10px;
}

/* Button */
div.stButton {
    display: flex;
    justify-content: center;
}

/* Button style */
.stButton button {
    background-color: #4CAF50;
    color: white;
    border-radius: 10px;
    height: 45px;
    width: 200px;
    font-size: 16px;
    border: none;
}

.stButton button:hover {
    background-color: #45a049;
}

/* Result box */
.success-box {
    padding: 15px;
    border-radius: 10px;
    background-color: #d4edda;
    color: #155724;
    font-weight: bold;
    text-align: center;
}

.error-box {
    padding: 15px;
    border-radius: 10px;
    background-color: #f8d7da;
    color: #721c24;
    font-weight: bold;
    text-align: center;
}

/* Divider */
hr {
    margin: 30px 0;
}

</style>
""", unsafe_allow_html=True)


def fsm_check(input_string):
    state = "S"
    path = ["S"]

    for char in input_string:
        if state == "S":
            state = "A" if char == "0" else "B"

        elif state == "A":
            state = "C" if char == "0" else "B"

        elif state == "B":
            state = "A" if char == "0" else "B"

        elif state == "C":
            state = "C"

        path.append(state)

    return state, path


st.title("FSM Checker")

st.markdown("<hr>", unsafe_allow_html=True)

st.subheader("Deskripsi Bahasa L")
st.markdown("""
**L = { x ∈ (0 + 1)+ | last character = 1 dan tidak ada substring '00' }**

✔ Hanya terdiri dari 0 dan 1  
✔ Tidak boleh ada "00"  
✔ Harus berakhir dengan 1  
""")

st.markdown("<hr>", unsafe_allow_html=True)

st.subheader("Diagram FSM")
try:
    image = Image.open("images/diagram.png")
    st.image(image, use_container_width=True)
except:
    st.warning("ERROR: Diagram tidak ditemukan di images/diagram.png")

st.markdown("<hr>", unsafe_allow_html=True)

# Input
st.subheader("Input String")
user_input = st.text_input("Masukkan string (0 dan 1):")
check = st.button("Check String")

# Output
if check:
    if not user_input:
        st.warning("Input tidak boleh kosong!")

    elif any(c not in "01" for c in user_input):
        st.error("Hanya boleh 0 dan 1!")

    else:
        final_state, path = fsm_check(user_input)

        st.subheader("Jalur State")
        st.write(" → ".join(path))

        if "00" in user_input:
            st.markdown('<div class="error-box">DITOLAK: Terdapat substring "00"</div>', unsafe_allow_html=True)

        elif user_input[-1] != "1":
            st.markdown('<div class="error-box">DITOLAK: Tidak berakhir dengan 1</div>', unsafe_allow_html=True)

        elif final_state == "B":
            st.markdown('<div class="success-box">DITERIMA</div>', unsafe_allow_html=True)

        else:
            st.markdown('<div class="error-box">DITOLAK</div>', unsafe_allow_html=True)