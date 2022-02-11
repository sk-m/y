cmake_minimum_required(VERSION 3.0)

project(YBackend)

set(CMAKE_CXX_STANDARD 20)

find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Boost REQUIRED context)

include_directories(${OPENSSL_INCLUDE_DIR} include)

set(LIBS ${Boost_LIBRARIES} ${CMAKE_THREAD_LIBS_INIT}
          ${OPENSSL_LIBRARIES})

add_executable(main main.cpp)

# Drogon build configuration
set(BUILD_EXAMPLES OFF CACHE INTERNAL "Don't build examples")
set(BUILD_CTL OFF CACHE INTERNAL "Don't build drogon ctl")
set(BUILD_ORM OFF CACHE INTERNAL "Don't build drogon orm")

add_subdirectory(third_party/drogon)
target_link_libraries(main PRIVATE ${LIBS} drogon)
