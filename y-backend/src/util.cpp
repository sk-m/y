constexpr char _hexmap[] = {'0', '1', '2', '3', '4', '5', '6', '7',
                           '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};

/**
 * @brief convert some data into a hex string
 * @details IMPORTANT! Because each source byte is represented by two chars, the out_str must be twice as big as data + 1 (for \0)
 * 
 * @param data input buffer
 * @param data_len buffer size, bytes
 * @param out_str char array to write the hex string to (size must be (data_len * 2) + 1)
 */
void make_hex_string(unsigned char* data, unsigned int data_len, char* out_str) {
    for (int i = 0; i < data_len; ++i) {
        out_str[2 * i]     = _hexmap[(data[i] & 0xF0) >> 4];
        out_str[2 * i + 1] = _hexmap[data[i] & 0x0F];
    }

    out_str[data_len * 2] = '\0';
}