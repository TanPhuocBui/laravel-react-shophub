---
name: shophub-verification
description: Kiểm tra và báo cáo nghiệm thu thay đổi ShopHub theo tiêu chí quan sát được. Dùng cho review, hồi quy, QA trình duyệt, kiểm thử API và xác minh tài liệu hoặc skill.
---

# Nghiệm thu ShopHub

Dựa vào yêu cầu hiện tại và [tiêu chí hoàn thành của repo](../../../AGENTS.md#13-kiểm-thử-và-tiêu-chí-hoàn-thành). So sánh Git diff với hiện trạng lúc bắt đầu. Chọn kiểm tra theo rủi ro và loại thay đổi.

- Gắn mỗi tiêu chí nghiệm thu với thao tác thật hoặc bằng chứng đọc được. Với API, kiểm tra route, payload, status, auth, role và ownership liên quan. Với dữ liệu ghi, kiểm tra trạng thái đã lưu và trường hợp thất bại hoặc gửi lại.
- Với frontend, tách lint/build khỏi kiểm tra trình duyệt. Kiểm tra từ route người dùng thật, bàn phím và kích thước phù hợp. Khi có API thật, xác minh session/CSRF và kết quả lưu. Nếu dùng fixture, ghi phạm vi fixture và hành vi quan sát được.
- Với DB, xác minh đích trước khi chạy lệnh ghi và kiểm thử. Dùng dữ liệu kiểm thử cách ly. Ghi rõ engine, loại phép kiểm và môi trường. Khi cần kiểm tra cạnh tranh, dùng kết nối riêng và kiểm tra bất biến sau cả hai thao tác.
- Với tài liệu hoặc skill, kiểm tra frontmatter nếu có, đường dẫn, lệnh được viện dẫn, phạm vi diff và sự nhất quán với repo. Chọn một tình huống thực tế để kiểm tra hướng dẫn định tuyến nếu thay đổi quy trình.

## Kết quả trên chat

- Tóm tắt mục tiêu, thay đổi và file liên quan.
- Ghi lệnh hoặc thao tác đã chạy, kết quả, bằng chứng và các mục chưa xác minh. Dùng PASS/FAIL chỉ cho phép kiểm đã thực hiện và ghi rõ giới hạn của phép kiểm.
- Nếu dùng nhiều skill, nêu ngắn gọn skill thực sự áp dụng khi điều đó giúp người dùng kiểm tra quy trình. Ghi phần còn lại theo phạm vi task và gợi ý commit nếu phù hợp với hướng dẫn repo.
