"""Executable entrypoint used by packaged desktop builds."""

from __future__ import annotations

import sys
import typing

from reading_plan.gui_api import main as gui_api_main
from reading_plan.http_api import main as http_api_main


if typing.TYPE_CHECKING:
    from collections.abc import Callable, Sequence

MODULE_NAME_ARG_INDEX = 1
MODULE_ARGS_START_INDEX = 2
ERROR_EXIT_CODE = 1
SUCCESS_EXIT_CODE = 0
GUI_API_MODULE_NAME = "reading_plan.gui_api"
HTTP_API_MODULE_NAME = "reading_plan.http_api"
MODULE_ENTRYPOINTS: dict[str, Callable[[], int]] = {
    GUI_API_MODULE_NAME: gui_api_main,
    HTTP_API_MODULE_NAME: http_api_main,
}


def module_name(argv: Sequence[str]) -> str:
    """Return the requested module name from process arguments.

    Raises:
        ValueError: If the module name argument is missing or blank.
    """
    if len(argv) <= MODULE_NAME_ARG_INDEX:
        msg = "planner module name is required"
        raise ValueError(msg)
    if name := argv[MODULE_NAME_ARG_INDEX].strip():
        return name
    msg = "planner module name is required"
    raise ValueError(msg)


def module_argv(argv: Sequence[str]) -> list[str]:
    """Return argv passed through to the requested planner module."""
    name = module_name(argv)
    return [name, *argv[MODULE_ARGS_START_INDEX:]]


def active_argv(argv: Sequence[str] | None) -> list[str]:
    """Return runtime argv from an explicit override or process state."""
    return list(sys.argv) if argv is None else list(argv)


def write_error(message: object) -> int:
    """Return a failure exit code after writing an error to stderr."""
    sys.stderr.write(f"{message}\n")
    return ERROR_EXIT_CODE


def exit_code_from_system_exit(exit_signal: SystemExit) -> int:
    """Return an integer process exit code from a module ``SystemExit``."""
    if isinstance(exit_signal.code, int):
        return exit_signal.code
    if exit_signal.code is None:
        return SUCCESS_EXIT_CODE
    return write_error(exit_signal.code)


def requested_entrypoint(argv: Sequence[str]) -> Callable[[], int]:
    """Return the supported planner entrypoint from process arguments.

    Raises:
        ValueError: If the requested module name is not supported.
    """
    name = module_name(argv)
    entrypoint = MODULE_ENTRYPOINTS.get(name)
    if entrypoint is not None:
        return entrypoint
    msg = f"unsupported planner module: {name}"
    raise ValueError(msg)


def run_requested_module(argv: Sequence[str]) -> int:
    """Return the exit code from the requested planner module."""
    entrypoint = requested_entrypoint(argv)
    original_argv = list(sys.argv)
    try:
        sys.argv = module_argv(argv)
        return entrypoint()
    finally:
        sys.argv = original_argv


def main(argv: Sequence[str] | None = None) -> int:
    """Return the CLI exit code for the requested planner module."""
    try:
        return run_requested_module(active_argv(argv))
    except ValueError as error:
        return write_error(error)
    except SystemExit as exit_signal:
        return exit_code_from_system_exit(exit_signal)


if __name__ == "__main__":
    raise SystemExit(main())
