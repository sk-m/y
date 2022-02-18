cmake_minimum_required(VERSION 3.0)

project(YBackend)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_BUILD_TYPE Debug)

find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Boost REQUIRED context)

set(THREADS_PREFER_PTHREAD_FLAG ON)

include_directories(${OPENSSL_INCLUDE_DIR} third_party/ src/)
link_directories(third_party/libpq third_party/fmt third_party/rapidjson src/)

set(LIBS pq fmt ${Boost_LIBRARIES} ${CMAKE_THREAD_LIBS_INIT}
          ${OPENSSL_LIBRARIES})

add_executable(main main.cpp)

# Drogon build configuration
set(BUILD_EXAMPLES OFF CACHE INTERNAL "Don't build examples")
set(BUILD_CTL OFF CACHE INTERNAL "Don't build drogon ctl")
set(BUILD_ORM OFF CACHE INTERNAL "Don't build drogon orm")

add_subdirectory(third_party/drogon)
target_link_libraries(main PRIVATE ${LIBS} drogon)
