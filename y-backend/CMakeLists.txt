cmake_minimum_required(VERSION 3.0)

project(YBackend)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_BUILD_TYPE Debug)

find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Boost REQUIRED context)
find_package(PostgreSQL REQUIRED)

set(THREADS_PREFER_PTHREAD_FLAG ON)

include_directories(${OPENSSL_INCLUDE_DIR} ${PostgreSQL_INCLUDE_DIRS} third_party/ third_party/yaml-cpp/include src/ src/api/)
link_directories(third_party/fastpbkdf2 src/ src/api/)

# Check if fastpbkdf2 lib is ready
if(NOT EXISTS "third_party/fastpbkdf2/fastpbkdf2.o")
    message(FATAL_ERROR "Please build the fastpbkdf2 package first (third_party/fastpbkdf2)") 
endif()

add_executable(y_server src/main.cpp)

# fmt
add_subdirectory(third_party/fmt)

# rapidjson
set(RAPIDJSON_BUILD_DOC OFF CACHE INTERNAL "Don't build rapidjson docs")
set(RAPIDJSON_BUILD_EXAMPLES OFF CACHE INTERNAL "Don't build rapidjson examples")
set(RAPIDJSON_BUILD_TESTS OFF CACHE INTERNAL "Don't build rapidjson tests")

add_subdirectory(third_party/rapidjson)

# yamlcpp
add_subdirectory(third_party/yaml-cpp)

# drogon
set(BUILD_EXAMPLES OFF CACHE INTERNAL "Don't build drogon examples")
set(BUILD_CTL OFF CACHE INTERNAL "Don't build drogon ctl")
set(BUILD_ORM OFF CACHE INTERNAL "Don't build drogon orm")
set(BUILD_SQLITE OFF CACHE INTERNAL "Don't build drogon sqlite")

add_subdirectory(third_party/drogon)

target_link_libraries(y_server PRIVATE PostgreSQL::PostgreSQL fmt::fmt yaml-cpp fastpbkdf2 drogon ${Boost_LIBRARIES} ${CMAKE_THREAD_LIBS_INIT}
${OPENSSL_LIBRARIES})
