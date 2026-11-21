"""
Universal Struct / DTO Transformer Library (Backend Python)
Digunakan di seluruh endpoint API untuk mentransformasi Request & Response Struct DTO
secara konsisten (selaras dengan `frontend/src/lib/lazy.js`).
"""

from typing import Any, Type, Union


class Lazy:
    @staticmethod
    def is_struct_class(target: Any) -> bool:
        return isinstance(target, type)

    @classmethod
    def transform(
        cls,
        source: Any,
        target_struct: Union[Type, list, None] = None,
        *,
        serialize: bool = False,
    ) -> Any:
        """
        Mentransformasi data mentah (dict / list / objek ORM / DTO) menjadi instance Struct DTO
        atau menyerialisasikannya kembali menjadi dictionary siap-JSON (`serialize=True`).

        Contoh penggunaan:
          req_dto = Lazy.transform(request.get_json(), LoginRequestDTO)
          res_dict = Lazy.transform(raw_data, LoginResponseDTO, serialize=True)
          res_list = Lazy.transform(raw_list, [UserResponseDTO], serialize=True)
        """
        if source is None:
            if isinstance(target_struct, list):
                return []
            if cls.is_struct_class(target_struct):
                instance = target_struct({})
                return cls.to_plain(instance) if serialize else instance
            return None

        # 1. Transformasi List / Koleksi: target_struct = [StructClass]
        if isinstance(target_struct, list) and len(target_struct) == 1:
            item_struct = target_struct[0]
            items = source if isinstance(source, (list, tuple)) else []
            return [
                cls.transform(item, item_struct, serialize=serialize)
                for item in items
            ]

        # 2. Transformasi ke Target Struct Class
        if cls.is_struct_class(target_struct):
            if isinstance(source, list):
                return [
                    cls.transform(item, target_struct, serialize=serialize)
                    for item in source
                ]

            if isinstance(source, target_struct):
                instance = source
            elif isinstance(source, dict):
                instance = target_struct(source)
            else:
                # Dukungan objek dengan atribut
                raw_dict = {
                    k: getattr(source, k)
                    for k in dir(source)
                    if not k.startswith("_") and not callable(getattr(source, k))
                }
                instance = target_struct(raw_dict)

            # Resolusi nested schema jika didefinisikan pada class DTO (`schema = {...}`)
            schema = getattr(target_struct, "schema", None)
            if isinstance(schema, dict):
                for field_name, field_struct in schema.items():
                    raw_val = getattr(instance, field_name, None)
                    if raw_val is not None:
                        setattr(
                            instance,
                            field_name,
                            cls.transform(raw_val, field_struct, serialize=False),
                        )

            if serialize:
                return cls.to_plain(instance)
            return instance

        # 3. Tanpa target_struct: serialisasi langsung ke plain dict/list
        return cls.to_plain(source)

    @classmethod
    def to_plain(cls, obj: Any) -> Any:
        if obj is None or isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, (list, tuple)):
            return [cls.to_plain(item) for item in obj]
        if isinstance(obj, dict):
            return {
                k: cls.to_plain(v)
                for k, v in obj.items()
                if v is not None or k in ("active_key_fingerprint", "key_fingerprint", "document_hash", "failure_reason", "last_decrypted_at")
            }
        if hasattr(obj, "__dict__"):
            result = {}
            for k, v in obj.__dict__.items():
                if not k.startswith("_"):
                    result[k] = cls.to_plain(v)
            return result
        return obj
