def is_palindrome_cfg(text):
   
    s = ''.join(char.lower() for char in text if char.isalnum())
    
    def check_grammar(string_input):
        if len(string_input) <= 1:
            return True
        if string_input[0] == string_input[-1]:
           return check_grammar(string_input[1:-1])
        return False

    return check_grammar(s)

def main():
    print("Cek String Palindrome")
    print("=" * 50)
    
    while True:
        user_input = input("\nMasukkan string ('exit' untuk berhenti): ")
        
        if user_input.lower() == 'exit':
            print("Stopped")
            break
            
        if is_palindrome_cfg(user_input):
            print(f"Hasil: (String '{user_input}' adalah palindrome)")
        else:
            print(f"Hasil: (String '{user_input}' bukan palindrome)")

if __name__ == "__main__":
    main()