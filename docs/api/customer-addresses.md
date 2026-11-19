# Sổ địa chỉ khách hàng — T05 / UC17

Prefix `/api/customer/addresses`. Sanctum SPA session/cookie, middleware tài khoản active và Gate `manage-addresses` chỉ cho role `customer`. Guest 401; admin hoặc customer bị khóa 403. Mutation cần CSRF như T00/PERF-01; không bearer token.

| Method | URL | Response |
|---|---|---|
| GET | `/api/customer/addresses` | `data`, `links`, `meta` phân trang Laravel Resource, 200 |
| POST | `/api/customer/addresses` | `{data: address}`, 201 |
| PUT | `/api/customer/addresses/{id}` | `{data: address}`, 200, gửi đầy đủ trường nhập |
| DELETE | `/api/customer/addresses/{id}` | 204 không body |
| PATCH | `/api/customer/addresses/{id}/default` | `{data: address}`, 200; không cần payload |

GET: `page` nguyên 1..1000000, `per_page` nguyên 1..50, mặc định 10. Xếp mặc định trước, rồi created_at và id giảm dần. Tổng và mọi dòng đều thuộc phiên hiện tại. Không có API đọc danh sách địa chỉ của tài khoản khác. Không có endpoint chọn địa chỉ cho đơn hàng.

## Payload và Resource

```json
{
  "recipient_name": "Tên người nhận",
  "phone": "0900000001",
  "province": "Thành phố Hồ Chí Minh",
  "ward": "Phường/Xã",
  "address_line": "Số nhà, tên đường, thông tin bổ sung",
  "is_default": false
}
```

- Các trường text bắt buộc: recipient_name ≤255, phone ≤20 theo schema (validation 8–15 chữ số, có thể thêm dấu + đầu), province/ward ≤100, address_line ≤255. Phone phải là JSON string, giữ số 0 đầu hoặc +. Không nhận số JSON, chữ, dấu phân cách trong số điện thoại. Nhập tỉnh/thành phố và phường/xã bằng văn bản, không bắt buộc quận/huyện hoặc gọi dịch vụ địa giới.
- is_default boolean tùy chọn; tạo mặc định false, sửa không gửi thì giữ trạng thái hiện tại. Địa chỉ đầu tiên luôn true bất kể gửi false. Không cho bỏ mặc định duy nhất bằng PUT false; trả 422 ở is_default và giữ toàn bộ thông tin cũ. Dùng thao tác đặt địa chỉ khác làm mặc định.
- user_id lấy từ phiên. user_id/id/created_at/updated_at không được gửi trong POST/PUT, kể cả null; 422. Service chỉ fill trường được phép, không nhận chủ sở hữu từ client.
- Resource: id, recipient_name, phone, province, ward, address_line, is_default boolean, created_at/updated_at ISO8601. Không trả user_id, email hoặc dữ liệu tài khoản khác.
- Validation dùng envelope Laravel `message/errors`; lỗi từng trường 422. Mọi thao tác ID đều scope quan hệ của user; không tồn tại/thuộc người khác đều 404. PUT kiểm tra ownership trước validation payload và kiểm tra lại khi giữ khóa.

## Mặc định và cạnh tranh

Tạo/sửa/xóa/đặt mặc định đều transaction: khóa **users.id của chủ sở hữu trước**, đọc lại role/customer/active, rồi mới truy vấn/khóa địa chỉ thuộc người đó. Khóa user giúp serialize cả trường hợp chưa có dòng địa chỉ để khóa. Các tài khoản khác nhau không dùng chung khóa sổ địa chỉ.

- Địa chỉ đầu tiên tự mặc định; danh sách có dữ liệu luôn có một mặc định trong các luồng service này.
- Đặt một địa chỉ mặc định chỉ bỏ cờ trên các dòng khác cùng owner, rồi đặt cờ đích. Gọi lại với địa chỉ đã mặc định không làm mất cờ.
- Sửa địa chỉ mặc định không vô tình bỏ cờ, không đổi owner/ID.
- Xóa địa chỉ mặc định chọn dòng còn lại có created_at sớm nhất, tie-break id nhỏ nhất; không dựa vào thứ tự mới nhất của UI. Xóa địa chỉ thường giữ mặc định hiện tại. Xóa cuối cùng trả sổ rỗng; lần tạo kế tiếp lại là mặc định.
- Lỗi ghi rollback cả dữ liệu và cờ mặc định. Ràng buộc FK/index user_id theo ERD; không dùng unique(user_id,is_default), vì cách đó sẽ hạn chế sai số địa chỉ không mặc định. Không tuyên bố DB chặn trực tiếp mọi SQL ngoài service.
- DB transaction có retry deadlock tối đa 3 lần sau rollback đã xác định; không có tác vụ ngoài DB trong transaction. Frontend không tự retry HTTP mutation chưa rõ kết quả.

## UI và lỗi kết nối

Khách hàng mở `/account` → **Địa chỉ giao hàng**, hoặc `/account?view=addresses`. Dùng AccountLayout/AccountField và Axios có sẵn, có phân trang, trạng thái tải/rỗng/lỗi/Thử lại. Form giữ dữ liệu khi 422, focus lỗi đầu tiên; nút dùng ref để chặn submit lặp. Xóa cần dialog xác nhận, hủy/Escape không gửi yêu cầu.

Sau mutation thành công UI đọc lại danh sách. Nếu response write mất/timeout hoặc 5xx, hoặc write thành công nhưng read-back lỗi, UI giữ dữ liệu nhập, chặn thao tác ghi và cho **Kiểm tra danh sách đã lưu** bằng GET. Chỉ sau khi GET thành công người dùng mới quyết định có gửi lại hay không. Không tự đoán trùng địa chỉ là cùng request và không tự phát lại POST/PUT/DELETE/PATCH. Nếu CSRF bootstrap lỗi trước khi gửi write, báo lỗi kết nối theo ngữ cảnh, không coi là write đã gửi.

Sổ địa chỉ hỗ trợ xóa dữ liệu hiện tại; snapshot giao hàng của đơn và việc chọn địa chỉ tại checkout thuộc T07, chưa triển khai ở T05.
