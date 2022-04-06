#include <stdexcept>
#include <string>
#include <functional>

// TODO @cleanup @refactor put all this in namespace Util?
// TODO @cleanup the code in here

// TODO this is probably completely ok, but I get a feeling that I'm thinking with the JS part of my brain here
// TODO rename to Status
struct Error {
    unsigned char contextual_error_code = 0;
    const char* explanation_user = nullptr;

    inline bool is_ok() const { return contextual_error_code == 0; };
};

template <typename T>
using CleanableResult = std::tuple<T, Error, std::function<void()>>;

constexpr char _hexmap[] = {'0', '1', '2', '3', '4', '5', '6', '7',
                           '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};

// TODO @performance speed of these hex-related functions?
// (c) fredoverflow; https://stackoverflow.com/questions/3381614/c-convert-string-to-hexadecimal-and-vice-versa
std::string string_to_hex(const std::string& input) {
    static const char hex_digits[] = "0123456789abcdef";

    std::string output;
    output.reserve(input.length() * 2);
    for (unsigned char c : input)
    {
        output.push_back(hex_digits[c >> 4]);
        output.push_back(hex_digits[c & 15]);
    }
    return output;
}

// (c) fredoverflow; https://stackoverflow.com/questions/3381614/c-convert-string-to-hexadecimal-and-vice-versa
int _hex_value(unsigned char hex_digit) {
    static const signed char hex_values[256] = {
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
         0,  1,  2,  3,  4,  5,  6,  7,  8,  9, -1, -1, -1, -1, -1, -1,
        -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    };
    int value = hex_values[hex_digit];
    if (value == -1) throw std::invalid_argument("invalid hex digit");
    return value;
}

// (c) fredoverflow; https://stackoverflow.com/questions/3381614/c-convert-string-to-hexadecimal-and-vice-versa
std::string hex_to_string(const std::string& input) {
    const auto len = input.length();
    if (len & 1) throw std::invalid_argument("odd length");

    std::string output;
    output.reserve(len / 2);
    for (auto it = input.begin(); it != input.end(); )
    {
        int hi = _hex_value(*it++);
        int lo = _hex_value(*it++);
        output.push_back(hi << 4 | lo);
    }
    return output;
}

// (c) Karol Kuczmarski "Xion" (https://xion.org.pl/2012/02/04/checking-whether-ip-is-within-a-subnet/)
bool is_ip_in_network(const char *addr, const char *net) {
    struct in_addr ip_addr;
    if(!inet_aton(addr, &ip_addr)) return false;

    char network[32];
    strncpy(network, net, strlen(net));

    char *slash_pos = strstr(network, "/");
    if(!slash_pos) return false;

    int mask_len = atoi(slash_pos + 1);
    *slash_pos = '\0';

    struct in_addr net_addr;
    if(!inet_aton(network, &net_addr)) return false;

    unsigned int ip_bits = ip_addr.s_addr;
    unsigned int net_bits = net_addr.s_addr;
    unsigned int netmask = net_bits & ((1 << mask_len) - 1);

    // TODO @hack allow /32
    if(netmask == 0 && ip_bits == net_bits) return true;

    return (ip_bits & netmask) == net_bits;
}
